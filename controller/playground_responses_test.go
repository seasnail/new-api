package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPlaygroundValidatesSelectedProtocol(t *testing.T) {
	previousDB, previousLogDB, previousRedis := model.DB, model.LOG_DB, common.RedisEnabled
	t.Cleanup(func() { model.DB, model.LOG_DB, common.RedisEnabled = previousDB, previousLogDB, previousRedis })
	db := setupModelListControllerTestDB(t)
	user := model.User{Username: "responses-playground", Group: "default", Status: common.UserStatusEnabled}
	require.NoError(t, db.Create(&user).Error)
	for _, tc := range []struct{ path, body, message string }{
		{"/pg/responses", `{"model":"gpt-test","input":"draw a robot","max_output_tokens":18446744073709551615}`, "max_output_tokens is invalid"},
		{"/pg/images/generations", `{"model":"gpt-image-2.5-sunburst","prompt":"draw a robot","n":18446744073709551615}`, "n must be an integer between"},
	} {
		t.Run(tc.path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(recorder)
			c.Request = httptest.NewRequest(http.MethodPost, tc.path, strings.NewReader(tc.body))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Set("id", user.Id)
			Playground(c)
			assert.Equal(t, http.StatusBadRequest, recorder.Code)
			assert.Contains(t, recorder.Body.String(), tc.message)
		})
	}
}
